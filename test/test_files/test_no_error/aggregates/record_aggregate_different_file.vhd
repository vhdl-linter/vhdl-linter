library ieee;
use ieee.std_logic_1164.all;
use work.record_definition.all;
entity record_aggregate_different_file is
end entity;
architecture arch of record_aggregate_different_file is
  constant DATA_WIDTH : integer := 8;

  signal foo : t_axi_stream(tdata(DATA_WIDTH - 1 downto 0), tkeep(DATA_WIDTH/8 -1 downto 0), tstrb(-1 downto 0), tid(-1 downto 0), tuser(-1 downto 0), tdest(0 downto 0));

begin
  foo <= (
    tdata  => x"AA",
    tvalid => '1',
    tstrb  => "",
    tkeep  => '1',
    tlast  => '1',
    tdest  => '0',
    tid    => "",
    tuser  => ""
    );
  assert true report to_string(foo.tdata);

end architecture;
