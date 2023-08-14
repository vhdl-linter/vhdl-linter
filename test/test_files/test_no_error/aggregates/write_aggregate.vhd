library ieee;
use ieee.std_logic_1164.all;
use work.record_definition.all;
entity write_aggregate is
  port (
    o_apple  : out t_axi_stream;
    o_banana : out std_ulogic;
    i_peach  : in  std_ulogic_vector(1 downto 0)
    );
end entity;
architecture rtl of write_aggregate is
begin
  (o_apple.tvalid, o_banana) <= i_peach;
end architecture;
