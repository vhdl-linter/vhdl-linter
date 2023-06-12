library ieee;
use ieee.std_logic_1164.all;
use work.pkg_array_def.all;
entity selected_name_range is
end entity;
architecture arch of selected_name_range is
  signal foo : test_record;
begin
  foo.data <= (foo.data'range => '0');

end architecture;
