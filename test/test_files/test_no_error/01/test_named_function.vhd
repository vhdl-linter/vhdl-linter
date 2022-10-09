package test_named_function is

end package;
package body test_named_function is
  function foo(a : integer) return integer is
  begin
    return a;
  end function foo;
  function bar(b : integer) return integer is
    variable c : integer;
  begin
    foo(a        => b);
    c := foo(a   => b);
    return foo(a => b);
  end function bar;

end package;
