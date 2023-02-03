entity inst_entity is
end entity;
architecture arch of inst_entity is
begin
  inst_test_entity : entity work.test_entity
    port map(
      4,
      port3 => 3,
      port2 => 5,
    );
end architecture;

entity test_entity is
  port (
    port1 : in integer;
    port2 : in integer;
    port3 : in integer
    );
end test_entity;

architecture arch of test_entity is

begin

end architecture;
