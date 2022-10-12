library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package pkg_genericStuff is
  generic (
    g_TEST : integer
  );

  type t_testData is record
    element: std_ulogic_vector(g_TEST - 1 downto 0);
  end record t_testData;

end package;