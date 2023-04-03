entity test_entity_generic_no_use is
end entity;
architecture arch of test_entity_generic_no_use is
  package test_pkg is new work.generic_pkg generic map (generic_parameter => 2); -- test_pkg should be used
  signal foo_unused : test_pkg.t_testData;
begin
end arch;