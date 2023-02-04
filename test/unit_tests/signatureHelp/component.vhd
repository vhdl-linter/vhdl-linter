library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity ent is

end ent;

architecture arch of ent is
  component test_entity is
    port (
      port1 : in integer;
      port2 : in integer;
      port3 : in integer
      );
    generic (
      GENERIC_A : integer := 5;
      GENERIC_B : integer := 5
      );
  end component;
begin
  inst_test_entity : test_entity port map();
end architecture;
