-- vhdl-linter-disable unused
entity test_instantiation_funky is
end entity;
architecture arch of test_instantiation_funky is
  function foo (A, B : integer) return integer is
  begin
    return A;
  end function;
  function mango(A, B, C : real) return integer is
  begin
    return 0;
  end function;
  function  plum(A, B : integer) return integer is
  begin
  end function;
  function bar (min, Max : time; Unit : time := ns) return integer is
    variable DataInt, A, B, C: integer;
  begin
    DataInt := mango(10.0, -100.0, 100.0);
    DataInt := plum(A, B - C);
    return foo(0, (Max - min)/Unit);
  end function bar;
begin

end architecture;
