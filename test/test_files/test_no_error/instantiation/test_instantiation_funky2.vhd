-- vhdl-linter-disable unused
entity test_instantiation_funky2 is
end entity;
architecture arch of test_instantiation_funky2 is
  function banana(a, b : string) return string is
  begin
    return "aa";
  end function;
  procedure pear(a : string) is
  begin
  end procedure;
  signal mango      : string(5 downto 1);
begin
  p_label : process is

  begin
    pear(banana(a => "a", b => "b") & "asd");
  end process;
end architecture;
