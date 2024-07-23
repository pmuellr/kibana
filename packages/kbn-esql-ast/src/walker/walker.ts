/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ESQLAstCommand,
  ESQLAstItem,
  ESQLAstNode,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandMode,
  ESQLCommandOption,
  ESQLFunction,
  ESQLInlineCast,
  ESQLList,
  ESQLLiteral,
  ESQLParamLiteral,
  ESQLSingleAstItem,
  ESQLSource,
  ESQLTimeInterval,
  ESQLUnknownItem,
} from '../types';

type Node = ESQLAstNode | ESQLAstNode[];

export interface WalkerOptions {
  visitCommand?: (node: ESQLCommand) => void;
  visitCommandOption?: (node: ESQLCommandOption) => void;
  visitCommandMode?: (node: ESQLCommandMode) => void;
  visitSingleAstItem?: (node: ESQLSingleAstItem) => void;
  visitSource?: (node: ESQLSource) => void;
  visitFunction?: (node: ESQLFunction) => void;
  visitColumn?: (node: ESQLColumn) => void;
  visitLiteral?: (node: ESQLLiteral) => void;
  visitListLiteral?: (node: ESQLList) => void;
  visitTimeIntervalLiteral?: (node: ESQLTimeInterval) => void;
  visitInlineCast?: (node: ESQLInlineCast) => void;
  visitUnknown?: (node: ESQLUnknownItem) => void;
}

/**
 * Iterates over all nodes in the AST and calls the appropriate visitor
 * functions.
 *
 * AST nodes supported:
 *
 * - [x] command
 * - [x] option
 * - [x] mode
 * - [x] function
 * - [x] source
 * - [x] column
 * - [x] literal
 * - [x] list literal
 * - [x] timeInterval
 * - [x] inlineCast
 * - [x] unknown
 */
export class Walker {
  /**
   * Walks the AST and calls the appropriate visitor functions.
   */
  public static readonly walk = (node: Node, options: WalkerOptions): Walker => {
    const walker = new Walker(options);
    walker.walk(node);
    return walker;
  };

  /**
   * Walks the AST and extracts all command statements.
   *
   * @param node AST node to extract parameters from.
   */
  public static readonly commands = (node: Node): ESQLCommand[] => {
    const commands: ESQLCommand[] = [];
    walk(node, {
      visitCommand: (cmd) => commands.push(cmd),
    });
    return commands;
  };

  /**
   * Walks the AST and extracts all parameter literals.
   *
   * @param node AST node to extract parameters from.
   */
  public static readonly params = (node: Node): ESQLParamLiteral[] => {
    const params: ESQLParamLiteral[] = [];
    Walker.walk(node, {
      visitLiteral: (param) => {
        if (param.literalType === 'param') {
          params.push(param);
        }
      },
    });
    return params;
  };

  /**
   * Returns the first function that matches the predicate.
   *
   * @param node AST subtree to search in.
   * @param predicate Function to test each function with.
   * @returns The first function that matches the predicate.
   */
  public static readonly findFunction = (
    node: Node,
    predicate: (fn: ESQLFunction) => boolean
  ): ESQLFunction | undefined => {
    let found: ESQLFunction | undefined;
    Walker.walk(node, {
      visitFunction: (fn) => {
        if (!found && predicate(fn)) {
          found = fn;
        }
      },
    });
    return found;
  };

  /**
   * Searches for at least one occurrence of a function or expression in the AST.
   *
   * @param node AST subtree to search in.
   * @param name Function or expression name to search for.
   * @returns True if the function or expression is found in the AST.
   */
  public static readonly hasFunction = (
    node: ESQLAstNode | ESQLAstNode[],
    name: string
  ): boolean => {
    return !!Walker.findFunction(node, (fn) => fn.name === name);
  };

  constructor(protected readonly options: WalkerOptions) {}

  public walk(node: undefined | ESQLAstNode | ESQLAstNode[]): void {
    if (!node) return;

    if (node instanceof Array) {
      for (const item of node) this.walk(item);
      return;
    }

    switch (node.type) {
      case 'command': {
        this.walkCommand(node as ESQLAstCommand);
        break;
      }
      default: {
        this.walkAstItem(node as ESQLAstItem);
        break;
      }
    }
  }

  public walkCommand(node: ESQLAstCommand): void {
    this.options.visitCommand?.(node);
    switch (node.name) {
      default: {
        this.walk(node.args);
        break;
      }
    }
  }

  public walkOption(node: ESQLCommandOption): void {
    this.options.visitCommandOption?.(node);
    for (const child of node.args) {
      this.walkAstItem(child);
    }
  }

  public walkAstItem(node: ESQLAstItem): void {
    if (node instanceof Array) {
      const list = node as ESQLAstItem[];
      for (const item of list) this.walkAstItem(item);
    } else {
      const item = node as ESQLSingleAstItem;
      this.walkSingleAstItem(item);
    }
  }

  public walkMode(node: ESQLCommandMode): void {
    this.options.visitCommandMode?.(node);
  }

  public walkListLiteral(node: ESQLList): void {
    this.options.visitListLiteral?.(node);
    for (const value of node.values) {
      this.walkAstItem(value);
    }
  }

  public walkSingleAstItem(node: ESQLSingleAstItem): void {
    const { options } = this;
    options.visitSingleAstItem?.(node);
    switch (node.type) {
      case 'function': {
        this.walkFunction(node as ESQLFunction);
        break;
      }
      case 'option': {
        this.walkOption(node);
        break;
      }
      case 'mode': {
        this.walkMode(node);
        break;
      }
      case 'source': {
        options.visitSource?.(node);
        break;
      }
      case 'column': {
        options.visitColumn?.(node);
        break;
      }
      case 'literal': {
        options.visitLiteral?.(node);
        break;
      }
      case 'list': {
        this.walkListLiteral(node);
        break;
      }
      case 'timeInterval': {
        options.visitTimeIntervalLiteral?.(node);
        break;
      }
      case 'inlineCast': {
        options.visitInlineCast?.(node);
        break;
      }
      case 'unknown': {
        options.visitUnknown?.(node);
        break;
      }
    }
  }

  public walkFunction(node: ESQLFunction): void {
    this.options.visitFunction?.(node);
    const args = node.args;
    const length = args.length;
    for (let i = 0; i < length; i++) {
      const arg = args[i];
      this.walkAstItem(arg);
    }
  }
}

export const walk = Walker.walk;
