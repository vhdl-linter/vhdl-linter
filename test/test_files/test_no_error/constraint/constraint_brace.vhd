library ieee;
use ieee.std_logic_1164.all;
entity constraint_brace is
  generic (
    GENERIC_INTEGER : integer
    );
  port (
    i_test : in std_ulogic_vector((GENERIC_INTEGER/8)-1 downto 0)
    );

end entity;
