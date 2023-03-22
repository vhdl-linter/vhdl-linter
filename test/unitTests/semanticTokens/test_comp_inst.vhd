entity test_component_inst is
end entity;
architecture arch of test_component_inst is
 component test_instantiation is
 end component;
begin
  inst_test_else_generate : test_instantiation
    port map (
      );
end architecture;
