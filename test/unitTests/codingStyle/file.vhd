entity dummy is
  port (
    foo : in integer := 1;
    bar : in integer := 0
    );
end entity;

entity instantiation is
end entity;
architecture arch of instantiation is
begin
  dummy3 : entity work.dummy
    port map (
      foo => 2,
      bar => 5
      );
  dummy4 : entity work.dummy
    port map (
      foo => open,
      bar => open
      );

  dummy : entity work.dummy
    port map (
      foo => 5
      );

  dummy2 : entity work.dummy
    port map (
      bar => 5
      );

  dummy5 : entity work.dummy;


end architecture;
