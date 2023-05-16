library ieee;
use ieee.std_logic_1164.all;

package pkg_complex0 is
  
  type rec2 is record
    elem3: std_ulogic_vector;
    elem4: std_ulogic_vector;
  end record;
  type rec0 is record
    recursive: rec2;
    elem2: std_ulogic_vector;
  end record;
end package;