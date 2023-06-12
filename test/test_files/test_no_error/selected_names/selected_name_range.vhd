library ieee;
use ieee.std_logic_1164.all;
use work.pkg_array_def.all;
entity selected_name_range is
  port (
    signal o_foo : out test_record
    );
end entity;
architecture arch of selected_name_range is
begin
  o_foo.data <= (o_foo.data'range => '0');

end architecture;
