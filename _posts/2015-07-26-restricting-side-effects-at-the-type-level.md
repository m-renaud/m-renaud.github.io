---
Time-stamp: <2015-07-28 22:16:56 ()>
layout: default
title: "Restricting Side Effects at the Type Level"
tags: [programming, haskell]

---

# Introduction

One of the most amazing features that Haskell offers over other
languages that I've used is the ability to restrict a functions
ability to interact with the outside world and other parts of the
system at the type level. While working in a large codebase there is a
lot of effort put into code reviews and testing to ensure that
contributors to the binary are not accessing resources that they
shouldn't be as this poses security risks as well as increasing the
potential of latency and capacity increases. Take for example a
function in C++ or Java:

```cpp
void Foo(Args args) {
  // Open file...
  // Connect to a network socket...
  // 
}
```

When writing code in Haskell when operating in the `IO` monad you have
similar freedom to manipulate the outside world:

```haskell
main = withFile "/some/file" ReadMode performSomeFileProcessing

```
