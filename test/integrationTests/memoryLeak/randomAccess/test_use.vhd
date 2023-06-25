library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

use work.pkg_test.all;

entity test_use is
end entity;

architecture rtl of test_use is
  signal a     : test_record;
begin
  assert true report integer'image(a.foo.foo_inner);
  a.foo.foo_inner <= a.foo.foo_inner;
end architecture;
