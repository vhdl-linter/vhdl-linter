library IEEE;
use IEEE.std_logic_1164.all;

package test_attribute_reference_chain is
end package;
package body test_attribute_reference_chain is
  constant test : std_ulogic_vector(1 downto 0) := "10";
  constant a : integer := test'subtype'length;
end package body;
