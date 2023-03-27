-- vhdl-linter-disable unused
entity test_instantiation_funky is
end entity;
architecture arch of test_instantiation_funky is
  function banane(a, b : string) return string is
  begin
    return "aa";
  end function;
  procedure birne(a : string) is
  begin
  end procedure;
  signal mango      : string;
begin
  p_label : process is

  begin
    birne(banane(a => "a", b => "b") & "asd");
  end process;
end architecture;
