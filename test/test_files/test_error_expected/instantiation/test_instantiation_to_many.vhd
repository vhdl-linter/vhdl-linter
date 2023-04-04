entity test_instantiation_to_many is
end entity;
architecture arch of test_instantiation_to_many is
  procedure foo(a             : integer) is -- vhdl-linter-disable-line unused
  begin
  end procedure;
  signal apfel, banana, birne : integer;  -- vhdl-linter-disable-line unused
begin
  foo(banana, birne); -- error: to many actuals
end architecture;
