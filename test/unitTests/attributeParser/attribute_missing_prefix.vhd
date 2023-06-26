library ieee;
use ieee.std_logic_1164.all;
entity attribute_missing_prefix is

end entity;
architecture arch of attribute_missing_prefix is
  signal a : std_ulogic_vector(5 downto 0);
  signal b : std_ulogic_vector(a'length);
  -- signal b : std_ulogic_vector(a');
begin
end architecture;
