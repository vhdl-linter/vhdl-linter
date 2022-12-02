use work.instantiated_pkg.all;
entity test is
end entity;
architecture arch of test is

  signal a : integer := generic_parameter;
begin
a <= a;
inst_test_entity_generic : entity work.test_entity_generic
  generic map (
    test_pkg => work.instantiated_pkg
  );

end arch;