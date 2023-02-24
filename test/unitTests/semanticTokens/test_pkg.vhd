library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package test_pkg is
  constant TEST : integer := 5;
  type test_record is record
    element: std_ulogic_vector(5 downto 0);
    another_element: std_logic_vector(TEST downto 5);
    banana: integer;
  end record test_record;
  procedure test_procedure(foo : integer) is
  begin

  end procedure;
end package;
