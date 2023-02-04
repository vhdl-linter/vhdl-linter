use work.pkg.all;
entity inst_entity is
end entity;
architecture arch of inst_entity is
begin
  inst_test_entity : entity work.test_entity
    port map(
      4,
      port3 => 3,
      port2 => 5
      );
  inst_test_entity2 : entity work.test_entity
    port map(
      port1 => 2,
      port2 => 5,
      asd   => a
      )
    generic map(
      GENERIC_A => 5,
      GENERIC_B => 5
      );
  test_procedure(2, 5);
end architecture;

entity test_entity is
  port (
    port1 : in integer;
    port2 : in integer;
    port3 : in integer
    );
  generic (
    GENERIC_A : integer := 5;
    GENERIC_B : integer := 5
    );
end test_entity;

architecture arch of test_entity is

begin

end architecture;
package pkg is
  procedure test_procedure (
    par1 : in integer;
    par2 : in integer
    );
end package;
