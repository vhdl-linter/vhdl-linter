entity test_instantiation_expression_to_many is
end entity;
architecture arch of test_instantiation_expression_to_many is
  function foo(a       : integer) return integer is
  begin
  return a;
  end function;
  signal apfel, banana, birne: integer; -- vhdl-linter-disable-line unused
begin
  apfel <= foo(banana, birne);
end architecture;
