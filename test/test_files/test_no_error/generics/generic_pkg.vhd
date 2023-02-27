library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package generic_pkg is
  generic (
    generic_parameter : integer := 0
    );

  type t_testData is record
    element : std_ulogic_vector(generic_parameter - 1 downto 0);
  end record t_testData;
end package;

package test_pkg is
  package identifier is new work.generic_pkg;

end package;
