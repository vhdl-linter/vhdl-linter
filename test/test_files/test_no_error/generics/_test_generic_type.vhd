
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
entity test_generic_type is
  generic (
    type datatype_t
    );
  port(
    i_write : in  datatype_t;
    o_read  : out datatype_t
    );
end test_generic_type;

architecture rtl of test_generic_type is
  type memory_t is array (integer range <>) of datatype_t;
  signal memory : memory_t(0 to 5);
begin
  p_write : process (all)
  begin
    memory(0) <= i_write;
    o_read    <= memory(0);
  end process;
end architecture;
