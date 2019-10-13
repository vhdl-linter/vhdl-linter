-------------------------------------------------
-- VHDL code for 4:1 multiplexor
-- (ESD book figure 2.5)
-- by Weijun Zhang, 04/2001
--
-- Multiplexor is a device to select different
-- inputs to outputs. we use 3 bits vector to
-- describe its I/O ports
-------------------------------------------------

library ieee;
use ieee.std_logic_1164.all;
-------------------------------------------------
entity yolo is
  port(
    o_asd : out std_logic
    );
end yolo;

-------------------------------------------------

architecture rtl of yolo is
  constant c_REQ_CA_GUID_OFFSET : integer := 128;

  signal s_test : std_logic_vector(c_REQ_CA_GUID_OFFSET - 10 downto 0);
begin
  s_test <= (others => '0');


  o_asd <= s_test(15 - 1 downto 0);

end rtl;

-----------------------------
