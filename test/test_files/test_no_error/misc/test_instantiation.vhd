entity dummy_instantiation_open is
  port (
    foo : out integer
    );
end entity;
entity instantiation_open is
end entity;
architecture arch of instantiation_open is
begin
  dummy : entity work.dummy_instantiation_open
    port map (
      foo => open -- allow open outputs
      );
end architecture;