import { expr2xy, xy2expr } from './alphabet';
import type { Formula } from './formula';
import { numberCalc } from './helper';

// Converting infix expression to a suffix expression
// src: AVERAGE(SUM(A1,A2), B1) + 50 + B20
// return: [A1, A2], SUM[, B1],AVERAGE,50,+,B20,+
type SuffixExprItem = string | [string, number];

const infixExprToSuffixExpr = (src: string): SuffixExprItem[] => {
  const operatorStack: string[] = [];
  const stack: SuffixExprItem[] = [];
  let subStrs: string[] = []; // SUM, A1, B2, 50 ...
  let fnArgType = 0; // 1 => , 2 => :
  let fnArgOperator = '';
  let fnArgsLen = 1; // A1,A2,A3...
  let oldc = '';
  for (let i = 0; i < src.length; i += 1) {
    const c = src.charAt(i);
    if (c !== ' ') {
      if (c >= 'a' && c <= 'z') {
        subStrs.push(c.toUpperCase());
      } else if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || c === '.') {
        subStrs.push(c);
      } else if (c === '"') {
        i += 1;
        while (src.charAt(i) !== '"') {
          subStrs.push(src.charAt(i));
          i += 1;
        }
        stack.push(`"${subStrs.join('')}`);
        subStrs = [];
      } else if (c === '-' && /[+\-*/,(]/.test(oldc)) {
        subStrs.push(c);
      } else {
        if (c !== '(' && subStrs.length > 0) {
          stack.push(subStrs.join(''));
        }
        if (c === ')') {
          let c1 = operatorStack.pop() ?? '';
          if (fnArgType === 2) {
            // fn argument range => A1:B5
            try {
              const [ex, ey] = expr2xy(stack.pop() as string);
              const [sx, sy] = expr2xy(stack.pop() as string);
              let rangelen = 0;
              for (let x = sx; x <= ex; x += 1) {
                for (let y = sy; y <= ey; y += 1) {
                  stack.push(xy2expr(x, y));
                  rangelen += 1;
                }
              }
              stack.push([c1, rangelen]);
            } catch (_e) {
              // ignore
            }
          } else if (fnArgType === 1 || fnArgType === 3) {
            if (fnArgType === 3) stack.push(fnArgOperator);
            // fn argument => A1,A2,B5
            stack.push([c1, fnArgsLen]);
            fnArgsLen = 1;
          } else {
            while (c1 !== '(') {
              stack.push(c1);
              if (operatorStack.length <= 0) break;
              c1 = operatorStack.pop() ?? '';
            }
          }
          fnArgType = 0;
        } else if (c === '=' || c === '>' || c === '<') {
          const nc = src.charAt(i + 1);
          fnArgOperator = c;
          if (nc === '=' || nc === '-') {
            fnArgOperator += nc;
            i += 1;
          }
          fnArgType = 3;
        } else if (c === ':') {
          fnArgType = 2;
        } else if (c === ',') {
          if (fnArgType === 3) {
            stack.push(fnArgOperator);
          }
          fnArgType = 1;
          fnArgsLen += 1;
        } else if (c === '(' && subStrs.length > 0) {
          // function
          operatorStack.push(subStrs.join(''));
        } else {
          // priority: */ > +-
          if (operatorStack.length > 0 && (c === '+' || c === '-')) {
            // Pop all operators with higher or equal precedence
            while (operatorStack.length > 0) {
              const top = operatorStack[operatorStack.length - 1];
              if (top === '(') break;
              // + and - have same precedence, * and / have higher precedence
              // So pop *, /, +, - when we see + or -
              if (top === '+' || top === '-' || top === '*' || top === '/') {
                const op = operatorStack.pop();
                if (op !== undefined) stack.push(op);
              } else {
                break;
              }
            }
          } else if (operatorStack.length > 0 && (c === '*' || c === '/')) {
            // Only pop * or / (same precedence)
            while (operatorStack.length > 0) {
              const top = operatorStack[operatorStack.length - 1];
              if (top === '*' || top === '/') {
                const op = operatorStack.pop();
                if (op !== undefined) stack.push(op);
              } else {
                break;
              }
            }
          }
          operatorStack.push(c);
        }
        subStrs = [];
      }
      oldc = c;
    }
  }
  if (subStrs.length > 0) {
    stack.push(subStrs.join(''));
  }
  while (operatorStack.length > 0) {
    const op = operatorStack.pop();
    if (op !== undefined) stack.push(op);
  }
  return stack;
};

const evalSubExpr = (
  subExpr: string,
  cellRender: (x: number, y: number) => number | string
): number | string => {
  const [fl] = subExpr;
  let expr = subExpr;
  if (fl === '"') {
    return subExpr.substring(1);
  }
  let ret = 1;
  if (fl === '-') {
    expr = subExpr.substring(1);
    ret = -1;
  }
  if (expr[0] >= '0' && expr[0] <= '9') {
    return ret * Number(expr);
  }
  const [x, y] = expr2xy(expr);
  return ret * (cellRender(x, y) as number);
};

// evaluate the suffix expression
// srcStack: <= infixExprToSufixExpr
// formulaMap: {'SUM': {}, ...}
// cellRender: (x, y) => {}
const evalSuffixExpr = (
  srcStack: SuffixExprItem[],
  formulaMap: Record<string, Formula>,
  cellRender: (x: number, y: number) => number | string,
  cellList: string[]
): unknown => {
  const stack: unknown[] = [];
  for (let i = 0; i < srcStack.length; i += 1) {
    const expr = srcStack[i];
    const fc = typeof expr === 'string' ? expr[0] : '';
    if (expr === '+') {
      const top = stack.pop();
      stack.push(numberCalc('+', stack.pop() as number, top as number));
    } else if (expr === '-') {
      if (stack.length === 1) {
        const top = stack.pop();
        stack.push(numberCalc('*', top as number, -1));
      } else {
        const top = stack.pop();
        stack.push(numberCalc('-', stack.pop() as number, top as number));
      }
    } else if (expr === '*') {
      stack.push(numberCalc('*', stack.pop() as number, stack.pop() as number));
    } else if (expr === '/') {
      const top = stack.pop();
      stack.push(numberCalc('/', stack.pop() as number, top as number));
    } else if (fc === '=' || fc === '>' || fc === '<') {
      let top = stack.pop() as number | string;
      if (!Number.isNaN(top)) top = Number(top);
      let left = stack.pop() as number | string;
      if (!Number.isNaN(left)) left = Number(left);
      let ret = false;
      if (fc === '=') {
        ret = left === top;
      } else if (expr === '>') {
        ret = left > top;
      } else if (expr === '>=') {
        ret = left >= top;
      } else if (expr === '<') {
        ret = left < top;
      } else if (expr === '<=') {
        ret = left <= top;
      }
      stack.push(ret);
    } else if (Array.isArray(expr)) {
      const [formula, len] = expr;
      const params: unknown[] = [];
      for (let j = 0; j < len; j += 1) {
        params.push(stack.pop());
      }
      stack.push(formulaMap[formula].render(params.reverse()));
    } else {
      if (cellList.includes(expr)) {
        return 0;
      }
      if ((fc >= 'a' && fc <= 'z') || (fc >= 'A' && fc <= 'Z')) {
        cellList.push(expr);
      }
      stack.push(evalSubExpr(expr, cellRender));
      cellList.pop();
    }
  }
  return stack[0];
};

const cellRender = (
  src: string,
  formulaMap: Record<string, Formula>,
  getCellText: (x: number, y: number) => string,
  cellList: string[] = []
): unknown => {
  if (src[0] === '=') {
    const stack = infixExprToSuffixExpr(src.substring(1));
    if (stack.length <= 0) return src;
    return evalSuffixExpr(
      stack,
      formulaMap,
      (x, y) => cellRender(getCellText(x, y), formulaMap, getCellText, cellList) as number | string,
      cellList
    );
  }
  return src;
};

export default {
  render: cellRender,
};
export { infixExprToSuffixExpr };
