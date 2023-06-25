library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

use work.pkg_test_inner.all;
package pkg_test is
  signal s: integer;
  constant c: integer := 3;
  subtype t is integer range 0 to 10;

  alias test_record_inner_alias is test_record_inner;
  constant test_signal_inner_unused : test_record_inner_alias;
end package;
