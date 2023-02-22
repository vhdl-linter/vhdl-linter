library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
use work.test_pkg.all;

entity test_signal is

end test_signal;

architecture arch of test_signal is
  signal foo      : std_ulogic;
  signal b        : std_ulogic;
  signal s_enum   : t_enum;
  signal s_record : t_record;
begin
  foo               <= '1';
  b                 <= std.standard.bit;
  s_enum            <= enum0;
  s_record.element1 <= s_enum;
end architecture;
