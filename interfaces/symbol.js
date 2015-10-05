// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol
declare class Symbol {
  static (value?:any): symbol;
  static for(key:string): symbol;
  static keyFor(symbol:symbol): string;
  toString(): string;
  valueOf(): symbol;
  // Well-known symbols
  static iterator: symbol;
  static match: symbol;
  static replace: symbol;
  static search: symbol;
  static split: symbol;
  static hasInstance: symbol;
  static isConcatSpreadable: symbol;
  static unscopables: symbol;
  static species: symbol;
  static toPrimitive: symbol;
  static toStringTag: symbol;
}

type symbol = Symbol;
