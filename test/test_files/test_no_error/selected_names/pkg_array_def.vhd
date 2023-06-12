
library ieee;
use ieee.std_logic_1164.all;
package pkg_array_def is
  type test is record
    element: integer;
  end record;
  type test_record is record
    data : std_ulogic_vector;
  end record;
  type test_array is array (natural range <>) of test;
end package;