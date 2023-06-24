library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

use work.pkg_test.all;

entity test_use is
end entity;

architecture rtl of test_use is
  constant s_t : t           := c;
  constant a   : test_record := (foo => (foo_inner => 5));
begin
  s <= s_t;
  assert true report a.foo.foo_inner;
end architecture;
