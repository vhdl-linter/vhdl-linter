use work.pkg.all;
entity inst_entity is
end entity;
architecture arch of inst_entity is
begin
  inst_test_entity : configuration work.test_entity_cfg
    port map(
      4,
      port3 => 3,
      port2 => 5
      );

  test_procedure(2, 5);
end architecture;

entity test_entity_for_cfg is
  port (
    port1 : in integer;
    port2 : in integer;
    port3 : in integer
    );
  generic (
    GENERIC_A : integer := 5;
    GENERIC_B : integer := 5
    );
end test_entity_for_cfg;

configuration test_entity_cfg of test_entity_for_cfg is

end configuration;
