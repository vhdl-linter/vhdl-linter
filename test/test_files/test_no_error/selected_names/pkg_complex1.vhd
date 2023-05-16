
library ieee;
use ieee.std_logic_1164.all;

use work.pkg_complex0.all;

package pkg_complex1 is
  type rec1 is record
    elem0: std_ulogic_vector;
    elem1: rec0;
  end record;
end package;