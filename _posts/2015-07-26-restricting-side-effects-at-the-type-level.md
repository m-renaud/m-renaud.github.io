---
Time-stamp: <2015-08-02 19:12:40 ()>
layout: default
title: "Pure Functions: Restricting Side Effects at the Type Level"
tags: [programming, haskell]

---

# Introduction

One of the most amazing features that Haskell offers over other
languages that I've used is the ability to restrict a functions
ability to interact with the outside world and other parts of the
system at the type level. This is possible because the language is
pure (or referentially transparent), which means that functions cannot
have side effects.

# The Problem

While working in a large codebase there is a lot of time and effort
put into code reviews and testing to ensure that contributors to a
project are not accessing resources that they shouldn't be as this
poses security risks as well as introducing the potential of latency
and capacity increases.

## What does this problem look like?

Take for example a function in C++ (prefixed with `c` for clarity of
explanation later)

```cpp
int cFoo() {
  std::ifstream file("/some/file");
  return performSomeFileProcessing(file);
}
```

and a similar function in Haskell (prefix with `h` for clarity of
explanation later)

```haskell
hFoo :: IO Int
hFoo = withFile "/some/file" ReadMode performSomeFileProcessing

```

The C++ function will likely look very familiar: you open up a file,
pass it to a function which returns an `int` which you then return
from `cFoo`, all very standard. The Haskell version may look a little
foreign but what it does is equivalent.

You'll notice that in the Haskell version that the return type of the
function `hFoo` is not `Int` but instead `IO Int`.This means that
`foo` is an I/O action that when performed will return an `Int`, but
to do so must interact with the outside world, namely the file
`"/some/file"`.

## How does this help us?

Lets use our new functions...

```cpp
// Every function in imperative languages is impure.
int cBar(int x, int y) {
  // The language will happily let you perform any side effects.
  int z = cFoo();
  return x + y + z;
}
```

```haskell
-- 'hBar' is a pure function taking two Ints and returning an Int.
hBar :: Int -> Int -> Int
hBar x y = x + y + z
  -- This is a compile error because 'hBar' is not an IO action.
  where z = hFoo
```

The fact that `hFoo` performs I/O is encoded in the type of the
function is of great value to us. The only way to actually perform
the IO action is when it is called either directly or indirectly from
`Main.main`, trying to call this function in any other context is a
compile error. Here's how we could use `hBar`:

```haskell
main :: IO ()
main = do
  z <- hFoo  -- Run the IO action and extract the Int return value.
  print z
```

You can also call it from any function that is an I/O action which is
called from main.

In addition to disallowing access to resources, it also makes it much
easier to reason about pure code.


## Restricted IO

Having to choose between all or nothing is also non-ideal, we would
like to allow the programmer to use the functions that we consider
*okay* to use in a given context. Next we'll show you how you can
restrict IO (or any other monad) to only allow writing to the console
and disallowing all other communication with the outside world.

We do this by creating a newtype wrapper around `IO` called `RIO`,
short for "Restricted IO" and defining our own print function.

```haskell
-- File: RIO.hs
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
module RIO (RIO(..), RIO.print) where

import           Control.Applicative
import           Control.Monad
import           Data.Functor
import qualified System.IO

newtype RIO a = RIO { runRIO :: IO a }
              deriving (Functor, Applicative, Monad)

print :: (Show a) => a -> RIO ()
print = RIO . System.IO.print
```

Now when users are writing a function we only allow them to write code
in the `RIO` monad, not the `IO` monad.

```haskell
-- File: UseRIO.hs
module UseRIO where

import qualified RIO

userFunction :: Int -> RIO.RIO Int
userFunction x = do
  RIO.print "userFunction"
  RIO.print ("x: " ++ show x)
  -- This line causes a compile error.
  withFile "/some/file" ReadMode performSomeFileProcessing
  return (x*2)
```
