entity test_verilog_parameter is
end entity;
architecture arch of test_verilog_parameter is
begin
  test_module_parameter : entity work.test_module_parameter
    generic map(
      A => 2,
      B => 2,
      C => 2
      )
    port map(in_bit => '1');
  test_module_parameter_opt : entity work.test_module_parameter
    generic map(
      -- A => 2,
      B => 2,
      C => 2
      )
    port map(in_bit => '1');

  test_module_no_parameter : entity work.test_module_no_parameter
    port map(in_bit => '1');
end architecture;
