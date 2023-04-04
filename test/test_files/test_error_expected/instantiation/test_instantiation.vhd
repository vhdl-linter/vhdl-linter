-- vhdl-linter-disable unused
entity test_instantiation is
end entity;
architecture arch of test_instantiation is
  procedure getBar(a, b, c, d : integer) is
  begin
  end procedure;
  procedure getFoo(a : integer; b : integer := 5) is
  begin
  end procedure;
  procedure getFoobar(a : integer; b : integer := 5; c : integer) is
  begin
  end procedure;
  signal apfel : integer;
begin
  p_label : process is
  begin
    getBar(0, b => 1, 2, 3); -- using positional arguments after named arguments is not allowed
  end process;
end architecture;
