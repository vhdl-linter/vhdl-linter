library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

use work.pkg_test.all;

entity test_no_use is
end entity;

architecture rtl of test_no_use is
  constant s_t : work.pkg_test.t := work.pkg_test.c;
begin
  p : process
  begin
    if work.pkg_test.s = s_t then -- verify that work.pkg_test.s can be read
    end if;
    -- TODO: this should also work
    -- work.pkg_test.s <= s_t;
  end process;
end architecture;