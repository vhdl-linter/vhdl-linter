library ieee;
use ieee.std_logic_1164.all;
entity first_entity is
  generic (
    LENGTH : positive
    );
  port (
    a : std_ulogic;
    b : std_ulogic_vector(7 downto 0);
    c : std_ulogic_vector(LENGTH -1 downto 0)
    );
end entity;
library ieee;
use ieee.std_logic_1164.all;
entity second_entity is
  generic (
    LENGTH : positive
    );
  port (
    d : std_ulogic;
    e : std_ulogic_vector(7 downto 0);
    f : std_ulogic_vector(LENGTH -1 downto 0)
    );
end entity;
