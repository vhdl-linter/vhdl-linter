library ieee;
use ieee.std_logic_1164.all;
entity test_entity is
  generic (
    LENGTH : positive
    );
  port (
    a : std_ulogic;
    b : std_ulogic_vector(7 downto 0);
    c : std_ulogic_vector(LENGTH -1 downto 0)
    );
end entity;
