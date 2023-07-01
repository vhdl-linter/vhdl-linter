library ieee;
use ieee.std_logic_1164.all;
entity record_aggregate_same_file is
end entity;
architecture arch of record_aggregate_same_file is
  constant DATA_WIDTH : integer := 8;
  type t_axi_stream is record
    tvalid : std_ulogic;
    tdata  : std_ulogic_vector;
    tstrb  : std_ulogic_vector;
    tkeep  : std_ulogic_vector;
    tlast  : std_ulogic;
    tid    : std_ulogic_vector;
    tdest  : std_ulogic_vector;
    tuser  : std_ulogic_vector;
  end record t_axi_stream;
  signal foo : t_axi_stream(tdata(DATA_WIDTH - 1 downto 0), tkeep(DATA_WIDTH/8 -1 downto 0), tstrb(-1 downto 0), tid(-1 downto 0), tuser(-1 downto 0), tdest(0 downto 0));

begin
  foo <= (
    tdata  => x"AA",
    tvalid => '1',
    tstrb  => "",
    tkeep  => "1",
    tlast  => '1',
    tdest  => "0",
    tid    => "",
    tuser  => ""
    );
  assert true report to_string(foo.tdata);
end architecture;
