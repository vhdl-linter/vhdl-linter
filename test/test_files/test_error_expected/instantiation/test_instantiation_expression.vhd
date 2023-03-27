entity test_instantiation_expression is
end entity;
architecture arch of test_instantiation_expression is
  function foo(a       : integer; b : integer) return integer is
  begin
  return a + b;
  end function;
  signal apfel, banana : integer; -- vhdl-linter-disable-line unused
begin
  apfel <= foo(banana);
end architecture;
