library ieee;
use ieee.std_logic_1164.all;

entity default_type_port is
  port (
    s: inout std_logic -- expect info to use std_ulogic
  );
end entity;

architecture test of default_type_port is
begin

s <= s;

end architecture;