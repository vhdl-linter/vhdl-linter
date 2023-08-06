library ieee;
use ieee.std_logic_1164.all;
entity test_entity is
end entity;
architecture arch of test_entity is
  signal a : std_ulogic; -- this is unused should complain
begin
end architecture;
