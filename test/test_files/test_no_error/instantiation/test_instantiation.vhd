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
    getBar(0, 1, 2, 3);
    getBar(a          => 0, b => 1, c => 2, d => 3);
    getBar(0, b       => 1, c => 2, d => 3);
    getBar(0, 1, c    => 2, d => 3);
    getBar(0, 1, 2, d => 3);
    getBar(0, 1, 2, 3);
    getFoo(a          => 1);
    getFoo(1);
    getFoobar(1, c    => 5);
  end process;
end architecture;
