entity test_instantiation_output_dummy2 is
  port (
    test  : out integer;
    test2 : out integer
    );
end entity;

entity test_instantiation_output2 is
end entity;
architecture arch of test_instantiation_output2 is
  signal test_unused : integer;
begin
  inst_test_instantiation_output_dummy : entity work.test_instantiation_output_dummy
    port map(test => test_unused);

end architecture;
