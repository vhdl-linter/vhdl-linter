package pkg is

  function foo (
    para : integer;
    para2 : integer
    ) return integer;
end pkg;

package body pkg is
  function bar return integer
  is
    variable apfel, birne: integer;
  begin
    return foo(apfel, birne)  ;
  end function;
end package body;
