<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [RecursiveReadonly](./kibana-plugin-server.recursivereadonly.md)

## RecursiveReadonly type


<b>Signature:</b>

```typescript
export declare type RecursiveReadonly<T> = T extends (...args: any[]) => any ? T : T extends any[] ? RecursiveReadonlyArray<T[number]> : T extends object ? Readonly<{
    [K in keyof T]: RecursiveReadonly<T[K]>;
}> : T;
```
