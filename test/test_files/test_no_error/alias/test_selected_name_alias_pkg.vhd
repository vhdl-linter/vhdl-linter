library IEEE;
package test_selected_name_alias_pkg is
  alias foo is ieee.std_logic_1164.std_ulogic_vector;
  procedure test_procedure(constant foo : in integer);
end package;
